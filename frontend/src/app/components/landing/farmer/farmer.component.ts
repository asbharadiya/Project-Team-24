import { Component, OnInit, ViewChild, ElementRef, NgZone } from '@angular/core';
import { FormControl } from "@angular/forms";
import { AgmMap, MapsAPILoader } from '@agm/core';
import { ModalService } from '../../../modal/modal.service';
import {AuthService} from "../../../services/auth.service";
import {SharedService} from "../../../services/shared.service";
import {FarmService} from "../../../services/farm.service";
import {ProposalService} from "../../../services/proposal.service";
import {Router} from "@angular/router";
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/observable/of';
import {UserService} from "../../../services/user.service";
import {AlertsService, AlertType} from "@jaspero/ng2-alerts/dist";

declare var google: any;

@Component({
  selector: 'app-farmer',
  templateUrl: './farmer.component.html',
  styleUrls: ['./farmer.component.css']
})
export class FarmerComponent implements OnInit {

  zoom: number = 12;

  lat: number = 37.3369;
  lng: number = -121.8863;
  mapView: boolean = true;

  public searchControl: FormControl;

  @ViewChild("search")
  public searchElementRef: ElementRef;

  @ViewChild('farmMap') map: AgmMap;
  @ViewChild('farmMap2') map2: AgmMap;

  farms: any[] = [];

  viewMapLat: number;
  viewMapLng: number;

  contactDetails: any = {};

  proposalData: any = {
    coverLetter: '',
    proposedUses: '',
    plannerOperations: '',
    invitedUsers: []
  };
  selectedFarmer: any;

  selectedFarm: any = {location:[],owner:{}};

  constructor(private router:Router, private modalService:ModalService, private authService:AuthService, private sharedService:SharedService, private farmService:FarmService, private proposalService:ProposalService, private userService:UserService, private mapsAPILoader: MapsAPILoader, private ngZone: NgZone, private _alert: AlertsService) { }

  ngOnInit() {
    if(navigator.geolocation){
      navigator.geolocation.getCurrentPosition(position => {
        this.lat = position.coords.latitude;
        this.lng = position.coords.longitude;
        this.searchNearByFarms();
      }, error => {
        this._alert.create('info', 'Your current location could not be determined. We are showing you farms near San Jose');
      });
    }

    this.searchControl = new FormControl();

    //load Places Autocomplete
    this.mapsAPILoader.load().then(() => {
      let autocomplete = new google.maps.places.Autocomplete(this.searchElementRef.nativeElement, {
        types: ["address"]
      });
      autocomplete.addListener("place_changed", () => {
        this.ngZone.run(() => {
          //get the place result
          let place: any = autocomplete.getPlace();
          //verify result
          if (place.geometry === undefined || place.geometry === null) {
            return;
          }
          //set latitude, longitude and zoom
          this.lat = place.geometry.location.lat();
          this.lng = place.geometry.location.lng();
          this.searchNearByFarms();
        });
      });
    });
  }

  searchNearByFarms(): void {
    this.farmService.searchFarms(this.lat,this.lng).subscribe((data: any) => {
      this.farms = data.data;
    }, error => {
      this._alert.create('error', 'There was some error in fetching farms near you');
    })
  }

  toggleView(): void {
    this.mapView = !this.mapView;
  }

  viewInMap(index: any): void {
    this.viewMapLat = this.farms[index].location[1];
    this.viewMapLng = this.farms[index].location[0];
    this.modalService.open('farm-location');
    this.map.triggerResize();
  }

  openSubmitProposal(index: any): void {
    if(this.farms[index].type === 'OWNER') {
      if (this.authService.isLogged) {
        this.proposalData = {
          coverLetter: '',
          proposedUses: '',
          plannedOperations: '',
          invitedUsers: []
        };
        this.selectedFarmer = null;
        this.selectedFarm = this.farms[index];
        this.modalService.open('new-proposal');
        this.map2.triggerResize();
      } else {
        this.sharedService.openAuthModal();
      }
    } else {
      this.contactDetails = this.farms[index].ownerInfo;
      this.modalService.open('contact-details');
    }
  }

  closeNewProposal(): void {
    this.selectedFarm = {location:[],owner:{}};
    this.modalService.close('new-proposal');
  }

  saveProposal(asDraft: boolean): void {
    //TODO: validation
    var payload = this.proposalData;
    payload.farm = this.selectedFarm._id;
    payload.farmOwner = this.selectedFarm.owner._id;
    payload.asDraft = asDraft;
    this.proposalService.createProposal(payload).subscribe((data: any) => {
      if(asDraft) {
        this._alert.create('success', 'New proposal created and saved as a draft');
      } else {
        this._alert.create('success', 'Congratulations! You have submitted the proposal to the farm owner');
      }
      this.modalService.close('new-proposal');
      this.router.navigate(['/proposal',data.data._id]);
    }, error => {
      this._alert.create('error', 'There was some error in creating the proposal');
    });
  }

  searchFarmers = (keyword: any): Observable<any[]> => {
    if (keyword) {
      return this.userService.searchFarmers(keyword)
        .map(res => {
          return res.data;
        })
    } else {
      return Observable.of([]);
    }
  }

  farmerSelected(e): void {
    if(e._id) {
      var found = this.proposalData.invitedUsers.some(function (el) {
        return el._id === e._id;
      });
      if (!found) { this.proposalData.invitedUsers.push({_id: e._id, firstName: e.firstName, lastName: e.lastName}); }
    }
    this.selectedFarmer = null;
  }

  removeFarmer(index: any): void {
    this.proposalData.invitedUsers.splice(index);
  }

  myListFormatter(data: any): string {
    return `${data['firstName']} ${data['lastName']} - ${data['email']}`;
  }

}
